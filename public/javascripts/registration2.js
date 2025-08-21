$(document).ready(function() {
    var customDataTable = $('#datatable').DataTable({
        "bPaginate": true,
        "bLengthChange": false,
        "bFilter": true,
        "bInfo": true,
        "bAutoWidth": true,
        "columnDefs": [
            {
                "targets": [ 0 ],
                "visible": false,
                "searchable": false
            }
            ]
        },
        
    );


    $("#customSearchTextBox").on("keyup search input paste cut", function() {
        customDataTable.search(this.value).draw();
     });

/*
    $('#customSearchTextBox').on('keyup', function (e) {


        clearTimeout($.data(this, 'timer'));
        if (e.keyCode == 13){
          search(true);
        }
        else
          $(this).data('timer', setTimeout(search, 500));
    });
*/

    function search(force) {
        var existingString = $("#customSearchTextBox").val();
        var previousString = $("#previousSearchValue").val();

        if(previousString.trim().toUpperCase() != existingString.trim().toUpperCase())
        //if (!force && existingString.length < 3) return; //wasn't enter, not > 2 char
        
        if(previousString.trim().toUpperCase() != existingString.trim().toUpperCase()){
            $("#previousSearchValue").val(existingString);
            customDataTable.search(existingString).draw();
        }
    }
    /*
    $('#customSearchTextBox').on('keyup', function (event) {
        if(event.which != 32 && event.which !=37 && event.which != 39)
            customDataTable.search(this.value).draw();
    });
    */
    

    $('#datatable tbody').on( 'click', 'tr', function () {
        if ( $(this).hasClass('selected') ) {
            $(this).removeClass('selected');

            
        }
        else {
            customDataTable.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');

            //var data = customDataTable.row( this ).data();
            //alert( 'You clicked on '+data[0]+'\'s row' );
    

            //console.log($(this).children().eq(0)[0].innerText);
        }
    } );
    
    $('#customDataTableEditRow').click( function () {
        var data = customDataTable.row('.selected').data();

        if(!data){
            alert('Please select a row');
            return;
        }
        window.location='/event/edit-registration/' + data[0];
  

       
    } );

    $('#customDataTablePrintRow').click( function () {
        var data = customDataTable.row('.selected').data();
        if(!data){
            alert('Please select a row');
            return;
        }
        //window.location='/event/print-badge/' + data[0];
        //window.open('/event/print-badge/' + data[0], '_blank', 'toolbar=yes,scrollbars=yes,resizable=yes,top=500,left=500,width=400,height=400');
        window.open('/event/print-badge/' + data[0], '_blank', '');

       
    } );

    $('#customDataTableAttendedRow').click( function () {
        var data = customDataTable.row('.selected').data();
        if(!data){
            alert('Please select a row');
            return;
        }
        //window.location='/event/print-badge/' + data[0];
        //window.open('/event/print-badge/' + data[0], '_blank', 'toolbar=yes,scrollbars=yes,resizable=yes,top=500,left=500,width=400,height=400');
        window.open('/event/attended/' + data[0], '_self', '');

       
    } );


} );

